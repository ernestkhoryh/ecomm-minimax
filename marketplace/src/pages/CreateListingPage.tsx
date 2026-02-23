import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { useListingStore } from '@/store/listingStore';
import { useAuthStore } from '@/store/authStore';
import {
  Upload,
  X,
  Loader2,
  Camera,
  DollarSign,
  Tag,
  MapPin,
  Truck,
  FileText,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { cn, CONDITION_OPTIONS, PRICE_TYPE_OPTIONS } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ListingCondition, PriceType, ListingStatus } from '@/types/database';

const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.number().min(0, 'Price must be positive'),
  price_type: z.enum(['fixed', 'negotiable', 'free']),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
  category_id: z.string().min(1, 'Please select a category'),
  brand: z.string().optional(),
  model: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  meetup_location: z.string().optional(),
  offers_shipping: z.boolean().optional(),
  shipping_fee: z.number().optional(),
  shipping_details: z.string().optional(),
});

type ListingFormData = z.infer<typeof listingSchema>;

interface UploadedImage {
  id: string;
  file?: File;
  url: string;
  preview: string;
}

export default function CreateListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { categories, createListing, updateListing, fetchCategories, fetchListingById } = useListingStore();
  const [images, setImages] = React.useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(!!id);
  const isEditing = !!id;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      price: 0,
      price_type: 'fixed',
      condition: 'good',
      offers_shipping: false,
    },
  });

  const priceType = watch('price_type');
  const offersShipping = watch('offers_shipping');

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCategories();
  }, [isAuthenticated, navigate, fetchCategories]);

  React.useEffect(() => {
    if (isEditing && id) {
      setIsLoadingData(true);
      fetchListingById(id).then((listing) => {
        if (listing) {
          reset({
            title: listing.title,
            description: listing.description,
            price: listing.price,
            price_type: listing.price_type as PriceType,
            condition: listing.condition as ListingCondition,
            category_id: listing.category_id || '',
            brand: listing.brand || '',
            model: listing.model || '',
            location_city: listing.location_city || '',
            location_state: listing.location_state || '',
            meetup_location: listing.meetup_location || '',
            offers_shipping: listing.offers_shipping,
            shipping_fee: listing.shipping_fee || undefined,
            shipping_details: listing.shipping_details || '',
          });

          if (listing.images) {
            setImages(
              listing.images.map((img) => ({
                id: img.id,
                url: img.url,
                preview: img.thumbnail_url || img.url,
              }))
            );
          }
        }
        setIsLoadingData(false);
      });
    }
  }, [isEditing, id, fetchListingById, reset]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      url: '',
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => {
      const combined = [...prev, ...newImages];
      return combined.slice(0, 10); // Max 10 images
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      if (image.url) {
        uploadedUrls.push(image.url);
        continue;
      }

      if (!image.file) continue;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(image.file);
      });

      uploadedUrls.push(dataUrl);
    }

    return uploadedUrls;
  };

  const onSubmit = async (data: ListingFormData, status: ListingStatus = 'published') => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images
      const imageUrls = await uploadImages();

      const listingData = {
        ...data,
        seller_id: user?.id,
        status,
        images: imageUrls,
        location_country: 'Philippines',
      };

      let result;
      if (isEditing && id) {
        result = await updateListing(id, listingData);
      } else {
        result = await createListing(listingData as Parameters<typeof createListing>[0]);
      }

      if (result.success) {
        toast.success(
          status === 'draft'
            ? 'Listing saved as draft'
            : isEditing
            ? 'Listing updated!'
            : 'Listing published!'
        );
        navigate('/my-listings');
      } else {
        toast.error(result.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  const parentCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Listing' : 'Create a Listing'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Update your listing details' : 'Fill in the details to list your item'}
          </p>
        </div>

        <form onSubmit={handleSubmit((data) => onSubmit(data, 'published'))}>
          {/* Images */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Camera className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
              <span className="text-sm text-gray-500">({images.length}/10)</span>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <input {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drag & drop images here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Up to 10 images, max 5MB each (JPEG, PNG, WebP)
              </p>
            </div>

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-3 mt-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2',
                      index === 0 ? 'border-red-500' : 'border-transparent'
                    )}
                  >
                    <img
                      src={image.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs text-center py-0.5">
                        Cover
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute top-1 left-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center cursor-grab">
                      <GripVertical className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('title')}
                  placeholder="e.g., iPhone 14 Pro Max 256GB - Space Black"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('category_id')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">Select a category</option>
                  {parentCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-red-500">{errors.category_id.message}</p>
                )}
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Condition <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {CONDITION_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center justify-center px-3 py-2 border rounded-xl cursor-pointer transition-colors text-sm',
                        watch('condition') === option.value
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        {...register('condition')}
                        value={option.value}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('description')}
                  rows={5}
                  placeholder="Describe your item in detail. Include any defects, accessories, or special features."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Brand
                  </label>
                  <input
                    type="text"
                    {...register('brand')}
                    placeholder="e.g., Apple"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Model
                  </label>
                  <input
                    type="text"
                    {...register('model')}
                    placeholder="e.g., iPhone 14 Pro Max"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
            </div>

            <div className="space-y-4">
              {/* Price Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRICE_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-colors',
                        priceType === option.value
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        {...register('price_type')}
                        value={option.value}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Price */}
              {priceType !== 'free' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Price (PHP) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                    <input
                      type="number"
                      {...register('price', { valueAsNumber: true })}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Location</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    {...register('location_city')}
                    placeholder="e.g., Manila"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    State/Province
                  </label>
                  <input
                    type="text"
                    {...register('location_state')}
                    placeholder="e.g., Metro Manila"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Meetup Location
                </label>
                <input
                  type="text"
                  {...register('meetup_location')}
                  placeholder="e.g., SM Mall of Asia, Main Mall Entrance"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Truck className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Shipping</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('offers_shipping')}
                  className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-gray-700">I offer shipping for this item</span>
              </label>

              {offersShipping && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Shipping Fee (PHP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                      <input
                        type="number"
                        {...register('shipping_fee', { valueAsNumber: true })}
                        placeholder="0 for free shipping"
                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Shipping Details
                    </label>
                    <textarea
                      {...register('shipping_details')}
                      rows={2}
                      placeholder="e.g., Ships via LBC, J&T, or Grab Express within Metro Manila"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isEditing ? 'Update' : 'Publish'} Listing</span>
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
