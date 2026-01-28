# Luma - Hotel My Dora Muhasebe Sistemi

Luma, Hotel My Dora için tasarlanmış minimal bir muhasebe ve nakit akış takip sistemidir.

## Özellikler

- **Alacak ve Borç Takibi**: Tüm alacak ve borç kayıtlarını kolayca yönetin
- **Kategori Yönetimi**: Resmi muhasebe kodlarına göre kategoriler oluşturun
- **Hesap Yönetimi**: Kategorilere bağlı hesaplar oluşturun
- **Defter Kayıtları**: Tarih, kategori, hesap, açıklama ve tutar bilgileriyle kayıt ekleyin
- **Filtreleme**: Tarih aralığı ve kategoriye göre filtreleme
- **Gruplama**: Kategoriye göre gruplu görünüm ve otomatik toplam hesaplama
- **Kimlik Doğrulama**: Supabase Auth ile güvenli giriş

## Teknoloji

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: TailwindCSS 4, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)

## Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Supabase Yapılandırması

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni bir proje oluşturun
3. `supabase/schema.sql` dosyasındaki SQL komutlarını Supabase SQL Editor'de çalıştırın
4. `.env.local.example` dosyasını `.env.local` olarak kopyalayın ve değerleri güncelleyin:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Kullanıcı Oluşturma

Supabase Dashboard > Authentication > Users bölümünden yeni kullanıcı oluşturun.

### 4. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Veritabanı Şeması

### Categories (Kategoriler)
- `id` (VARCHAR): Muhasebe kodu (örn: "102")
- `name` (VARCHAR): Kategori adı
- `created_at`, `updated_at`: Zaman damgaları

### Accounts (Hesaplar)
- `id` (UUID): Benzersiz tanımlayıcı
- `category_id` (VARCHAR): Bağlı kategori
- `name` (VARCHAR): Hesap adı
- `description` (TEXT): Açıklama
- `created_at`, `updated_at`: Zaman damgaları

### Ledger Entries (Defter Kayıtları)
- `id` (UUID): Benzersiz tanımlayıcı
- `date` (DATE): İşlem tarihi
- `category_id` (VARCHAR): Kategori
- `account_id` (UUID): Hesap
- `statement` (TEXT): Açıklama
- `receivable` (DOUBLE): Alacak tutarı
- `debt` (DOUBLE): Borç tutarı
- `created_at`, `updated_at`: Zaman damgaları

## Kullanım

1. **Giriş Yap**: E-posta ve şifre ile giriş yapın
2. **Kategori Oluştur**: Önce muhasebe kategorilerinizi oluşturun (örn: 102 - Banka)
3. **Hesap Oluştur**: Kategorilere bağlı hesaplar oluşturun
4. **Kayıt Ekle**: Defter sayfasından alacak veya borç kayıtları ekleyin
5. **Filtrele ve Görüntüle**: Tarih ve kategoriye göre filtreleyin, gruplu görünümde inceleyin

## Lisans

Bu proje Hotel My Dora için özel olarak geliştirilmiştir.
