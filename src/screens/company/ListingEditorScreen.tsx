import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { useApp } from '../../context/AppContext';
import { CompanyProfile, GalleryImage } from '../../types';
import { CompanyStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

type Props = NativeStackScreenProps<CompanyStackParamList, 'ListingEditor'>;

const PRICE_OPTIONS: CompanyProfile['priceRange'][] = ['£', '££', '£££'];

function blankProfile(defaultPhone: string): Omit<CompanyProfile, 'id'> {
  return {
    name: '',
    categoryIds: [],
    tagline: '',
    description: '',
    phone: defaultPhone,
    priceRange: '££',
    services: [],
  };
}

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

export default function ListingEditorScreen({ route, navigation }: Props) {
  const listingId = route.params?.listingId;
  const {
    myListings,
    createListing,
    updateListing,
    deleteListing,
    categories,
    proposeCategory,
    myProposedCategories,
    businessAccount,
    uploadCoverPhoto,
    fetchGalleryImages,
    addGalleryImage,
    removeGalleryImage,
  } = useApp();
  const existing = listingId ? myListings.find((l) => l.id === listingId) : undefined;
  const [profile, setProfile] = useState<Omit<CompanyProfile, 'id'>>(
    existing ?? blankProfile(businessAccount?.phone ?? '')
  );
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [proposedName, setProposedName] = useState('');
  const [proposing, setProposing] = useState(false);

  async function handleProposeCategory() {
    setProposing(true);
    const { error } = await proposeCategory(proposedName);
    setProposing(false);
    if (error) {
      notify('Could not suggest that', error);
      return;
    }
    setProposedName('');
    notify('Suggestion sent', 'An admin will review it. You’ll see it here once it’s approved.');
  }

  useEffect(() => {
    if (existing) setProfile(existing);
  }, [existing]);

  useEffect(() => {
    if (!listingId) return;
    fetchGalleryImages(listingId).then(setGallery);
  }, [listingId, fetchGalleryImages]);

  async function handleChangeCoverPhoto() {
    if (!listingId) return;
    const uri = await pickImage();
    if (!uri) return;
    setCoverUploading(true);
    const { error } = await uploadCoverPhoto(listingId, uri);
    setCoverUploading(false);
    if (error) notify('Could not upload cover photo', error);
  }

  async function handleAddGalleryImage() {
    if (!listingId) return;
    const uri = await pickImage();
    if (!uri) return;
    setGalleryUploading(true);
    const { error } = await addGalleryImage(listingId, uri);
    setGalleryUploading(false);
    if (error) {
      notify('Could not upload photo', error);
      return;
    }
    setGallery(await fetchGalleryImages(listingId));
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
    const trimmed = newServiceName.trim();
    if (!trimmed) return;
    const parsedPrice = newServicePrice.trim() ? parseFloat(newServicePrice) : NaN;
    const priceFrom = !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null;
    setProfile((p) => ({ ...p, services: [...p.services, { name: trimmed, priceFrom }] }));
    setNewServiceName('');
    setNewServicePrice('');
  }

  function removeService(index: number) {
    setProfile((p) => ({ ...p, services: p.services.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!profile.name.trim()) {
      notify('Name required', 'Give this listing a name so customers know who they’re booking.');
      return;
    }
    setSaving(true);
    if (listingId) {
      const { error } = await updateListing(listingId, profile);
      setSaving(false);
      if (error) {
        notify('Could not save', error);
        return;
      }
      notify('Saved', 'Your listing has been updated.');
    } else {
      const { error, id } = await createListing(profile);
      setSaving(false);
      if (error || !id) {
        notify('Could not create listing', error ?? 'Something went wrong.');
        return;
      }
      notify('Listing created', 'You can now add a cover photo and portfolio gallery.');
      navigation.replace('ListingEditor', { listingId: id });
    }
  }

  function handleDelete() {
    if (!listingId) return;
    confirmAction(
      'Delete listing',
      `This permanently removes "${profile.name || 'this listing'}" along with its photos, reviews and requests.`,
      'Delete',
      async () => {
        setDeleting(true);
        const { error } = await deleteListing(listingId);
        setDeleting(false);
        if (error) {
          notify('Could not delete', error);
          return;
        }
        navigation.goBack();
      }
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>{listingId ? 'Edit listing' : 'New listing'}</Text>
        <Text style={styles.subtitle}>This is what customers see when they view this listing.</Text>

        {listingId ? (
          <>
            <SectionLabel>Cover photo / logo</SectionLabel>
            <Pressable onPress={handleChangeCoverPhoto} disabled={coverUploading}>
              {profile.coverPhotoUrl ? (
                <Image source={{ uri: profile.coverPhotoUrl }} style={styles.coverPreview} resizeMode="cover" />
              ) : (
                <View style={[styles.coverPreview, styles.coverPlaceholder]}>
                  <Ionicons name="image-outline" size={28} color={colors.textFaint} />
                  <Text style={styles.coverPlaceholderText}>No cover photo yet</Text>
                </View>
              )}
            </Pressable>
            <View style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
              <Button
                title={profile.coverPhotoUrl ? 'Change cover photo' : 'Upload cover photo'}
                variant="outline"
                onPress={handleChangeCoverPhoto}
                loading={coverUploading}
              />
            </View>
          </>
        ) : (
          <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
            <Text style={styles.upsellText}>Save this listing first to add a cover photo and gallery.</Text>
          </Card>
        )}

        <SectionLabel>Listing name</SectionLabel>
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

        <View style={styles.suggestBox}>
          <Text style={styles.suggestHeading}>Can’t find your trade?</Text>
          <Text style={styles.suggestBody}>
            Suggest it and we’ll review it. Once approved it appears under “Other” for customers to browse.
          </Text>
          <View style={styles.suggestRow}>
            <TextInput
              style={styles.suggestInput}
              value={proposedName}
              onChangeText={setProposedName}
              placeholder="e.g. Pool maintenance"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
            <Button title="Suggest" onPress={handleProposeCategory} loading={proposing} />
          </View>
          {myProposedCategories.length > 0 && (
            <View style={styles.proposalList}>
              {myProposedCategories.map((p) => (
                <View key={p.id} style={styles.proposalRow}>
                  <Ionicons
                    name={
                      p.status === 'approved'
                        ? 'checkmark-circle'
                        : p.status === 'rejected'
                        ? 'close-circle'
                        : 'time-outline'
                    }
                    size={15}
                    color={
                      p.status === 'approved'
                        ? colors.success
                        : p.status === 'rejected'
                        ? colors.textFaint
                        : colors.pending
                    }
                  />
                  <Text style={styles.proposalName}>{p.name}</Text>
                  <Text style={styles.proposalStatus}>
                    {p.status === 'approved' ? 'Approved' : p.status === 'rejected' ? 'Not approved' : 'Awaiting review'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <SectionLabel>Price range</SectionLabel>
        <View style={styles.chipWrap}>
          {PRICE_OPTIONS.map((p) => (
            <Chip key={p} label={p} selected={profile.priceRange === p} onPress={() => setProfile((prev) => ({ ...prev, priceRange: p }))} />
          ))}
        </View>

        <SectionLabel>Availability indicator</SectionLabel>
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

        <SectionLabel>Phone</SectionLabel>
        <TextInput
          style={styles.input}
          value={profile.phone}
          onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
        />

        <SectionLabel>Services & pricing</SectionLabel>
        {profile.services.map((s, i) => (
          <View key={`${s.name}-${i}`} style={styles.serviceRow}>
            <Text style={styles.serviceText}>
              •  {s.name} {s.priceFrom != null ? `— from £${s.priceFrom}` : ''}
            </Text>
            <Pressable onPress={() => removeService(i)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addServiceRow}>
          <TextInput
            style={[styles.input, { flex: 2, marginBottom: 0 }]}
            value={newServiceName}
            onChangeText={setNewServiceName}
            placeholder="Service..."
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
          />
          <View style={styles.priceInputWrap}>
            <Text style={styles.priceInputPrefix}>as from £</Text>
            <TextInput
              style={styles.priceInput}
              value={newServicePrice}
              onChangeText={setNewServicePrice}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              onSubmitEditing={addService}
            />
          </View>
          <Pressable style={styles.addButton} onPress={addService}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {listingId && (
          <>
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
          </>
        )}

        <View style={{ height: spacing.lg }} />
        <Button title={listingId ? 'Save changes' : 'Create listing'} onPress={handleSave} loading={saving} />
        {listingId && (
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Delete listing" variant="danger" onPress={handleDelete} loading={deleting} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
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
  suggestBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  suggestHeading: { fontSize: 14, fontWeight: '800', color: colors.text },
  suggestBody: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  suggestInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  proposalList: { marginTop: spacing.md, gap: 6 },
  proposalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proposalName: { fontSize: 13, fontWeight: '600', color: colors.text },
  proposalStatus: { fontSize: 11.5, color: colors.textMuted, marginLeft: 'auto' },
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
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    ...shadow.card,
  },
  priceInputPrefix: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  priceInput: { width: 56, fontSize: 14, color: colors.text, padding: spacing.sm, paddingLeft: 4 },
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
