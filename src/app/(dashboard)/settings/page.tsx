import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
  title: 'Paramètres | RETEX360',
  description: 'Gérez votre profil et vos préférences',
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Fetch user profile with SDIS
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      grade,
      avatar_url,
      role,
      sdis:sdis_id(id, code, name)
    `)
    .eq('id', user.id)
    .single();

  // Fetch SDIS list for potential change
  const { data: sdisList } = await supabase
    .from('sdis')
    .select('id, code, name')
    .order('code');

  // Normalize sdis
  const userSdis = profile?.sdis 
    ? (Array.isArray(profile.sdis) ? profile.sdis[0] : profile.sdis)
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary" />
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre profil et vos préférences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="password">Mot de passe</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm 
            profile={{
              id: profile?.id || user.id,
              email: profile?.email || user.email || '',
              full_name: profile?.full_name || '',
              grade: profile?.grade || '',
              avatar_url: profile?.avatar_url || '',
              sdis_id: userSdis?.id || '',
            }}
            sdisList={sdisList || []}
          />
        </TabsContent>

        <TabsContent value="password">
          <PasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
