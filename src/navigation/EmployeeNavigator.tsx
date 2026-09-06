import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import EmployeeJobsScreen from '../screens/employee/EmployeeJobsScreen';
import { EmployeeStackParamList } from './types';

const Stack = createNativeStackNavigator<EmployeeStackParamList>();

// One screen on purpose. An employee's whole world is the jobs assigned to
// them — there is no billing, no listing and no team list for them to reach,
// so a tab bar would only be signposting things that aren't there.
export default function EmployeeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeJobs" component={EmployeeJobsScreen} />
    </Stack.Navigator>
  );
}
