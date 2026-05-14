'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

const schema = z
  .object({
    newPassword: z.string().min(8, 'M?t kh?u t?i thi?u 8 k� t?'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'M?t kh?u x�c nh?n kh�ng kh?p',
    path: ['confirmPassword'],
  });

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center max-w-sm">
          <p className="text-red-500 font-medium mb-4">Link kh�ng h?p l? ho?c d� h?t h?n.</p>
          <Link href="/forgot-password" className="text-sm text-indigo-600 hover:underline">
            Y�u c?u link m?i
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetForm) => {
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg?.includes('h?t h?n') || msg?.includes('h?p l?')) {
        toast.error('Link d?t l?i m?t kh?u d� h?t h?n. Vui l�ng y�u c?u link m?i.');
      } else {
        toast.error(msg ?? 'C� l?i x?y ra');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Vietnam</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {!success ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">�?t l?i m?t kh?u</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Nh?p m?t kh?u m?i cho t�i kho?n c?a b?n.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    M?t kh?u m?i
                  </label>
                  <div className="relative">
                    <input
                      {...register('newPassword')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="T?i thi?u 8 k� t?"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    X�c nh?n m?t kh?u
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Nh?p l?i m?t kh?u m?i"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? '�ang x? l�...' : '�?t l?i m?t kh?u'}
                </button>
              </form>
            </>
          ) : (
            /* Success */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">�?t l?i th�nh c�ng!</h2>
              <p className="text-sm text-gray-500 mb-6">
                M?t kh?u c?a b?n d� du?c c?p nh?t. Vui l�ng dang nh?p l?i.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition"
              >
                �ang nh?p ngay
              </button>
            </div>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={14} />
                Quay l?i dang nh?p
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
