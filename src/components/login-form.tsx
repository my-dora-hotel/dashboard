"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

// Supabase auth error messages in Turkish
function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    "Invalid login credentials": "Geçersiz e-posta veya şifre",
    "Email not confirmed": "E-posta adresi doğrulanmamış",
    "User not found": "Kullanıcı bulunamadı",
    "Invalid email or password": "Geçersiz e-posta veya şifre",
    "Too many requests": "Çok fazla deneme. Lütfen biraz bekleyin",
    "Email rate limit exceeded": "E-posta gönderim limiti aşıldı",
    "Password should be at least 6 characters": "Şifre en az 6 karakter olmalı",
    "User already registered": "Bu e-posta zaten kayıtlı",
    "Signup requires a valid password": "Geçerli bir şifre gerekli",
    "Unable to validate email address: invalid format": "Geçersiz e-posta formatı",
  }
  
  return translations[message] || "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin."
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(translateAuthError(error.message))
        return
      }

      toast.success("Giriş başarılı!")
      router.push("/accounting/ledger")
      router.refresh()
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-8 md:p-12" onSubmit={handleLogin}>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col items-center gap-2 text-center mb-2">
                <h1 className="text-2xl font-bold">Hoş Geldiniz</h1>
                <p className="text-muted-foreground text-balance">
                  My Dora hesabınıza giriş yapın
                </p>
              </div>
              <div className="flex flex-col gap-7">
                <Field>
                  <FieldLabel htmlFor="email">E-posta</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Şifre</FieldLabel>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Şifrenizi mi unuttunuz?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-4 mt-2">
                <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isLoading || !email || !password}>
                  {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Hesabınıza erişim için yöneticinizle iletişime geçin.
                </p>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="https://www.go-istanbul-hotels.com/data/Pics/700x500w/17237/1723738/1723738009/pic-my-dora-hotel-istanbul-19.JPEG"
              alt="My Dora Hotel Istanbul"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <p className="px-6 text-center text-xs text-zinc-600">
        Devam ederek{" "}
        <a href="#" className="underline underline-offset-4 hover:text-zinc-400">Kullanım Şartları</a>{" "}
        ve{" "}
        <a href="#" className="underline underline-offset-4 hover:text-zinc-400">Gizlilik Politikası</a>
        &apos;nı kabul etmiş olursunuz.
      </p>
    </div>
  )
}
