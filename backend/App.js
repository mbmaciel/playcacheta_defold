import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BuyFichasScreen from './src/screens/BuyFichasScreen';
import PixPaymentScreen from './src/screens/PixPaymentScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsScreen from './src/screens/TermsScreen';
import EditProfileFieldScreen from './src/screens/EditProfileFieldScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import SupportScreen from './src/screens/SupportScreen';
import FaqScreen from './src/screens/FaqScreen';
import ReferFriendScreen from './src/screens/ReferFriendScreen';

import { colors } from './src/constants/theme';
import { storage, authAPI, usersAPI } from './src/services/api';
import { gameSocket } from './src/services/gameSocket';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export const ToastContext = createContext({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator({ initialRouteName = 'Home' }) {
  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="BuyFichas"
        component={BuyFichasScreen}
        options={{
          tabBarLabel: 'Comprar',
          tabBarIcon: ({ color, size }) => <Ionicons name="card" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function getWebLoginTokenFromPath() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const match = window.location.pathname.match(/^\/login\/([^/?#]+)/);
  if (!match || !match[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function clearWebLoginPath() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.history?.replaceState) return;
  window.history.replaceState({}, '', '/');
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [initialTab, setInitialTab] = useState('Home');
  const toastTimerRef = useRef(null);

  // Verifica token salvo ao iniciar
  useEffect(() => {
    (async () => {
      try {
        const webLoginToken = getWebLoginTokenFromPath();

        if (webLoginToken) {
          try {
            await storage.saveToken(webLoginToken);
            const { user: fresh } = await usersAPI.me();
            await storage.saveUser(fresh);
            setInitialTab('BuyFichas');
            setUser(fresh);
          } catch {
            await storage.removeToken();
            await storage.removeUser();
          } finally {
            clearWebLoginPath()
          }
        } else {
          const cached = await storage.getUser();
          const token  = await AsyncStorage.getItem('@playcacheta:token');
          if (cached && token) {
            // Valida token e atualiza dados
            try {
              const { user: fresh } = await usersAPI.me();
              setUser(fresh);
              await storage.saveUser(fresh);
            } catch {
              // Token expirado
              await storage.removeToken();
              await storage.removeUser();
            }
          }
        }
      } catch (err) {
        console.error('Auth restore error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (token, userData) => {
    await storage.saveToken(token);
    await storage.saveUser(userData);
    setInitialTab('Home');
    setUser(userData);
  };

  const logout = async () => {
    gameSocket.disconnect();
    await AsyncStorage.multiRemove([
      '@playcacheta:token',
      '@playcacheta:user',
    ]);
    setInitialTab('Home');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { user: fresh } = await usersAPI.me();
      setUser(fresh);
      await storage.saveUser(fresh);
      return fresh;
    } catch {
      return user;
    }
  };

  const showToast = (message, type = 'error') => {
    if (!message) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, refreshUser }}>
      <ToastContext.Provider value={{ showToast }}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator
              key={user ? 'authenticated' : 'guest'}
              screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
            >
              {!user ? (
                <>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                  <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                  <Stack.Screen name="Terms" component={TermsScreen} />
                </>
              ) : (
                <>
                  <Stack.Screen name="Main">
                    {() => <TabNavigator initialRouteName={initialTab} />}
                  </Stack.Screen>
                  <Stack.Screen
                    name="PixPayment"
                    component={PixPaymentScreen}
                    options={{ animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="EditProfileField" component={EditProfileFieldScreen} />
                  <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
                  <Stack.Screen name="Support" component={SupportScreen} />
                  <Stack.Screen name="Faq" component={FaqScreen} />
                  <Stack.Screen name="ReferFriend" component={ReferFriendScreen} />
                  <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                  <Stack.Screen name="Terms" component={TermsScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>

          {toast && (
            <View pointerEvents="none" style={toastStyles.overlay}>
              <View
                style={[
                  toastStyles.toast,
                  toast.type === 'success' && toastStyles.success,
                  toast.type === 'warning' && toastStyles.warning,
                  toast.type === 'error' && toastStyles.error,
                ]}
              >
                <Ionicons
                  name={
                    toast.type === 'success'
                      ? 'checkmark-circle'
                      : toast.type === 'warning'
                        ? 'warning'
                        : 'alert-circle'
                  }
                  size={18}
                  color="#fff"
                />
                <Text style={toastStyles.message}>{toast.message}</Text>
              </View>
            </View>
          )}
        </View>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

const toastStyles = {
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 20,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  error: {
    backgroundColor: colors.error,
  },
  success: {
    backgroundColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warning,
  },
};
