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
import { RippleButton } from '@/components/ui/ripple-button';

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
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
    mode: 'onBlur',
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
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* === Marketing pane (lg+) === */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-[hsl(var(--sidebar-bg))] text-white">
        {/* Aurora background */}
        <div className="absolute inset-0 bg-mesh opacity-90 pointer-events-none" />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-aurora opacity-30 blur-3xl pointer-events-none"
          style={{ animation: 'breathe 8s ease-in-out infinite' }}
        />
        <div
          className="absolute -top-20 -left-10 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--aurora-cyan)) 0%, transparent 70%)',
            opacity: 0.35,
            filter: 'blur(60px)',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-aurora flex items-center justify-center font-bold font-display shadow-pop">
            A
          </div>
          <div>
            <div className="font-semibold font-display">Aurora CRM</div>
            <div className="text-xs text-white/60">cho doanh nghiệp Việt Nam</div>
          </div>
        </div>

        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Quản lý khách hàng,<br />chốt deal nhanh hơn.
          </h2>
          <p className="text-white/70 mt-3 text-sm max-w-sm">
            Phễu bán hàng · Kanban deals · Marketing đa kênh (Email/SMS/Zalo/Messenger) · RBAC chi
            tiết tới từng quyền.
          </p>
          <div className="mt-8 flex items-center gap-6 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-aurora-mint rounded-full breathe" />
              Đang hoạt động
            </div>
            <div>Hệ thống CRM dành cho doanh nghiệp vừa &amp; nhỏ</div>
          </div>
        </div>
      </div>

      {/* === Form pane === */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-aurora rounded-xl mb-4 shadow-pop">
              <span className="text-white font-bold text-base font-display">A</span>
            </div>
            <h1 className="font-display text-xl font-bold">Aurora CRM</h1>
          </div>

          <h3 className="font-display text-2xl font-bold">Đăng nhập</h3>
          <p className="text-sm text-muted-foreground mt-1">Chào mừng quay lại 👋</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="ten@congty.vn"
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition placeholder:text-muted-foreground"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground">Mật khẩu</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-aurora-violet hover:opacity-80 font-semibold transition-opacity"
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
                  className="w-full h-11 px-3.5 pr-10 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="w-4 h-4 rounded border-border text-aurora-violet focus:ring-aurora-violet cursor-pointer accent-[hsl(var(--aurora-violet))]"
              />
              <label htmlFor="rememberMe" className="text-sm text-foreground cursor-pointer select-none">
                Ghi nhớ đăng nhập
              </label>
            </div>

            {/* Submit */}
            <RippleButton
              type="submit"
              variant="aurora"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </RippleButton>
          </form>

          {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_EMAIL && (
            <div className="mt-6 p-3 bg-muted rounded-xl border border-border">
              <p className="text-xs text-foreground font-semibold mb-1">Demo accounts:</p>
              <p className="text-xs text-muted-foreground">
                {process.env.NEXT_PUBLIC_DEMO_EMAIL} / {process.env.NEXT_PUBLIC_DEMO_PASSWORD}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
