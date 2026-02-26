import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Loader2,
  Bell,
  Shield,
  CreditCard,
  LogOut,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  phone: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

type TabType = 'profile' | 'notifications' | 'security' | 'billing';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile, logout } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<TabType>('profile');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: user?.display_name || '',
      username: user?.username || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      location_city: user?.location_city || '',
      location_state: user?.location_state || '',
    },
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    if (user) {
      reset({
        display_name: user.display_name || '',
        username: user.username || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location_city: user.location_city || '',
        location_state: user.location_state || '',
      });
    }
  }, [user, reset]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 2 * 1024 * 1024,
    maxFiles: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      let avatar_url = user.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const filename = `${user.id}/avatar-${Date.now()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filename, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path);

        avatar_url = publicUrl;
      }

      const result = await updateProfile({
        ...data,
        avatar_url,
      });

      if (result.success) {
        toast.success('Profile updated successfully');
        setAvatarFile(null);
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors',
                    activeTab === tab.id
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}

              <hr className="my-2" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Avatar */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h2>
                  <div className="flex items-center space-x-6">
                    <div
                      {...getRootProps()}
                      className={cn(
                        'relative w-24 h-24 rounded-full cursor-pointer overflow-hidden',
                        isDragActive && 'ring-4 ring-red-500/50'
                      )}
                    >
                      <input {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />
                      {avatarPreview || user.avatar_url ? (
                        <img
                          src={avatarPreview || user.avatar_url!}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                          {user.display_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Drag & drop or click to upload
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Max 2MB, JPG/PNG/WebP
                      </p>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                          className="text-sm text-red-600 hover:text-red-700 mt-2"
                        >
                          Remove new photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Display Name
                      </label>
                      <input
                        type="text"
                        {...register('display_name')}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                      {errors.display_name && (
                        <p className="mt-1 text-sm text-red-500">{errors.display_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                        <input
                          type="text"
                          {...register('username')}
                          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Bio
                      </label>
                      <textarea
                        {...register('bio')}
                        rows={3}
                        placeholder="Tell buyers a bit about yourself..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                      />
                      {errors.bio && (
                        <p className="mt-1 text-sm text-red-500">{errors.bio.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                          />
                        </div>
                        {user.email_verified ? (
                          <span className="flex items-center space-x-1 text-green-600 text-sm">
                            <Check className="w-4 h-4" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          {...register('phone')}
                          placeholder="+63 9XX XXX XXXX"
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        City
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          {...register('location_city')}
                          placeholder="Manila"
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        State/Province
                      </label>
                      <input
                        type="text"
                        {...register('location_state')}
                        placeholder="Metro Manila"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </form>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h2>

                <div className="space-y-6">
                  {[
                    { id: 'messages', label: 'New messages', description: 'When someone sends you a message' },
                    { id: 'offers', label: 'Offers', description: 'When someone makes an offer on your listing' },
                    { id: 'likes', label: 'Likes', description: 'When someone likes your listing' },
                    { id: 'followers', label: 'New followers', description: 'When someone follows you' },
                    { id: 'promo', label: 'Promotions', description: 'Tips, updates, and special offers' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Password</h2>
                  <button className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                    Change Password
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h2>
                  <p className="text-gray-600 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors">
                    Enable 2FA
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Delete Account</h2>
                  <p className="text-gray-600 mb-4">
                    Permanently delete your account and all associated data
                  </p>
                  <button className="flex items-center space-x-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors">
                    <Trash2 className="w-5 h-5" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      Free
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Upgrade to Pro for unlimited listings, featured placement, and priority support.
                  </p>
                  <button className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-orange-600 transition-colors">
                    Upgrade to Pro
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
                  <p className="text-gray-500">No payment methods added</p>
                  <button className="mt-4 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                    Add Payment Method
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
