import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { getTierInfo } from '../../data/tiers';
import { useApp } from '../../context/AppContext';
import { CompanyProfile, GalleryImage } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

const PRICE_OPTIONS: CompanyProfile['priceRange'][] = ['£', '££', '£££'];

async function pickImage() {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Photo access needed', 'Please allow photo library access to upload a picture.');
      return null;
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6,
    allowsEditing: true,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

export default function MyListingScreen() {
  const { companyProfile, updateCompanyProfile, businessTier, categories, businessAccount, uploadCoverPhoto, fetchGalleryImages, addGalleryImage, removeGalleryImage } =
    useApp();
  const [profile, setProfile] = useState<CompanyProfile>(companyProfile);
  const [newService, setNewService] = useState('');
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const tier = businessTier;
  const canShowAvailability = tier === 'premium' || tier === 'pro';

  useEffect(() => {
    if (!businessAccount) return;
    fetchGalleryImages(businessAccount.id).then(setGallery);
  }, [businessAccount, fetchGalleryImages]);

  async function handleChangeCoverPhoto() {
    const uri = await pickImage();
    if (!uri) return;
    setCoverUploading(true);
    const { error } = await uploadCoverPhoto(uri);
    setCoverUploading(false);
    if (error) notify('Could not upload cover photo', error);
  }

  async function handleAddGalleryImage() {
    const uri = await pickImage();
    if (!uri) return;
    setGalleryUploading(true);
    const { error } = await addGalleryImage(uri);
    setGalleryUploading(false);
    if (error) {
      notify('Could not upload photo', error);
      return;
    }
    if (businessAccount) setGallery(await fetchGalleryImages(businessAccount.id));
  }

  async function handleRemoveGalleryImage(imageId: string) {
    setGallery((prev) => prev.filter((g) => g.id !== imageId));
    await removeGalleryImage(imageId);
  }

  function toggleCategory(id: string) {
    setProfile((p) => ({
      ...p,
      categoryIds: p.categoryIds.includes(id) ? p.categoryIds.filter((c) => c !== id) : [...p.categoryIds, id],
    }));
  }

  function addService() {
    const trimmed = newService.trim();
    if (!trimmed) return;
    setProfile((p) => ({ ...p, services: [...p.services, trimmed] }));
    setNewService('');
  }

  function removeService(index: number) {
    setProfile((p) => ({ ...p, services: p.services.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await updateCompanyProfile(profile);
    setSaving(false);
    if (error) {
      notify('Could not save', error);
      return;
    }
    notify('Saved', 'Your business listing has been updated.');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>My listing</Text>
        <Text style={styles.subtitle}>This is what customers see when they view your business.</Text>
        {tier && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>{getTierInfo(tier).name} plan</Text>
          </View>
        )}

        <SectionLabel>Cover photo / logo</SectionLabel>
        <Pressable onPress={handleChangeCoverPhoto} disabled={coverUploading}>
          {companyProfile.coverPhotoUrl ? (
            <Image source={{ uri: companyProfile.coverPhotoUrl }} style={styles.coverPreview} resizeMode="cover" />
          ) : (
            <View style={[styles.coverPreview, styles.coverPlaceholder]}>
              <Ionicons name="image-outline" size={28} color={colors.textFaint} />
              <Text style={styles.coverPlaceholderText}>No cover photo yet</Text>
            </View>
          )}
        </Pressable>
        <View style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
          <Button
            title={companyProfile.coverPhotoUrl ? 'Change cover photo' : 'Upload cover photo'}
            variant="outline"
            onPress={handleChangeCoverPhoto}
            loading={coverUploading}
          />
        </View>

        <SectionLabel>Business name</SectionLabel>
        <TextInput
          style={styles.input}
          value={profile.name}
          onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
        />

        <SectionLabel>Tagline</SectionLabel>
        <TextInput
          style={styles.input}
          value={profile.tagline}
          onChangeText={(v) => setProfile((p) => ({ ...p, tagline: v }))}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
        />

        <SectionLabel>Description</SectionLabel>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={profile.description}
          onChangeText={(v) => setProfile((p) => ({ ...p, description: v }))}
          multiline
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
        />

        <SectionLabel>Categories</SectionLabel>
        <View style={styles.chipWrap}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={profile.categoryIds.includes(c.id)}
              onPress={() => toggleCategory(c.id)}
            />
          ))}
        </View>

        <SectionLabel>Price range</SectionLabel>
        <View style={styles.chipWrap}>
          {PRICE_OPTIONS.map((p) => (
            <Chip key={p} label={p} selected={profile.priceRange === p} onPress={() => setProfile((prev) => ({ ...prev, priceRange: p }))} />
          ))}
        </View>

        <SectionLabel>Availability indicator</SectionLabel>
        {canShowAvailability ? (
          <Card style={styles.availabilityCard}>
            <View style={styles.availabilityRow}>
              <Text style={styles.availabilityLabel}>Show "Available now" to customers</Text>
              <Switch
                value={!!profile.availableNow}
                onValueChange={(v) => setProfile((p) => ({ ...p, availableNow: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.availabilityCard}>
            <Text style={styles.upsellText}>
              Available on Premium and Pro plans. Upgrade in Settings to show real-time availability to customers.
            </Text>
          </Card>
        )}

        <SectionLabel>Phone</SectionLabel>
        <TextInput
          style={styles.input}
          value={profile.phone}
          onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
        />

        <SectionLabel>Services</SectionLabel>
        {profile.services.map((s, i) => (
          <View key={`${s}-${i}`} style={styles.serviceRow}>
            <Text style={styles.serviceText}>•  {s}</Text>
            <Pressable onPress={() => removeService(i)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addServiceRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={newService}
            onChangeText={setNewService}
            placeholder="Add a service..."
            placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
            onSubmitEditing={addService}
          />
          <Pressable style={styles.addButton} onPress={addService}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <SectionLabel>Gallery</SectionLabel>
        <Text style={styles.galleryHint}>Show off your past work — customers see these on your listing.</Text>
        <View style={styles.galleryGrid}>
          {gallery.map((image) => (
            <View key={image.id} style={styles.galleryItem}>
              <Image source={{ uri: image.url }} style={styles.galleryImage} resizeMode="cover" />
              <Pressable style={styles.galleryRemove} onPress={() => handleRemoveGalleryImage(image.id)} hitSlop={8}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.galleryAdd} onPress={handleAddGalleryImage} disabled={galleryUploading}>
            <Ionicons name={galleryUploading ? 'hourglass-outline' : 'add'} size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={{ height: spacing.lg }} />
        <Button title="Save listing" onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.infoBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  tierBadgeText: { fontSize: 11.5, fontWeight: '700', color: colors.info },
  availabilityCard: { marginTop: spacing.xs, marginBottom: spacing.md },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  availabilityLabel: { fontSize: 14, color: colors.text, flex: 1, marginRight: spacing.sm },
  upsellText: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, marginBottom: spacing.sm },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceText: { fontSize: 14, color: colors.text, flex: 1 },
  remove: { fontSize: 12, color: colors.danger, fontWeight: '700' },
  addServiceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    ...shadow.card,
  },
  addButtonText: { color: colors.textInverse, fontWeight: '700' },
  coverPreview: {
    width: '100%',
    height: 140,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceAlt,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  coverPlaceholderText: { fontSize: 12.5, color: colors.textFaint, marginTop: 6, fontWeight: '600' },
  galleryHint: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  galleryItem: { width: 84, height: 84 },
  galleryImage: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  galleryRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryAdd: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
