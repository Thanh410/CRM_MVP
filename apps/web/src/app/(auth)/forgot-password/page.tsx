'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setSentEmail(data.email);
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
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
          {!sent ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Quên mật khẩu?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Nhập email của bạn, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="nguyen.van.a@company.vn"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? 'Đang gửi...' : 'Gửi hướng dẫn'}
                </button>
              </form>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                <Mail size={28} className="text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Kiểm tra email của bạn</h2>
              <p className="text-sm text-gray-500 mb-1">
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới:
              </p>
              <p className="text-sm font-medium text-indigo-600 mb-4">{sentEmail}</p>
              <p className="text-xs text-gray-400 mb-6">
                Không thấy email? Kiểm tra thư mục spam hoặc thử lại sau vài phút.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Gửi lại
              </button>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-left">
                  <p className="text-xs text-amber-700 font-medium">Dev mode</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Xem reset URL trong console của API server (apps/api terminal)
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={14} />
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
