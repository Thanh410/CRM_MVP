'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
    mode: 'onBlur',         // validate on field blur — feedback ngay khi user rời field
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      const { accessToken, refreshToken, user } = res.data;

      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setAuth({ ...user, ...meRes.data }, accessToken, refreshToken, data.rememberMe);
      toast.success(`Chào mừng, ${meRes.data.fullName}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
      {/* Logo above card */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-11 h-11 bg-white/10 rounded-xl mb-4">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <h1 className="text-xl font-semibold text-white">CRM Vietnam</h1>
        <p className="text-zinc-400 text-sm mt-1">Đăng nhập vào tài khoản của bạn</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-100 p-8 w-full max-w-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Email</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="nguyen.van.a@company.vn"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition placeholder:text-zinc-400"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-700">Mật khẩu</label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition pr-10 placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2">
            <input
              {...register('rememberMe')}
              id="rememberMe"
              type="checkbox"
              className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer accent-zinc-900"
            />
            <label htmlFor="rememberMe" className="text-sm text-zinc-600 cursor-pointer select-none">
              Ghi nhớ đăng nhập
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_EMAIL && (
          <div className="mt-6 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
            <p className="text-xs text-zinc-500 font-medium mb-1">Demo accounts:</p>
            <p className="text-xs text-zinc-400">{process.env.NEXT_PUBLIC_DEMO_EMAIL} / {process.env.NEXT_PUBLIC_DEMO_PASSWORD}</p>
          </div>
        )}
      </div>
    </div>
  );
}
