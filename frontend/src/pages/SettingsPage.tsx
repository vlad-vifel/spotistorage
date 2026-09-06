import type { ReactNode } from "react";
import { LibraryPathSetting } from "@/components/settings/LibraryPathSetting";
import { DependencyStatus } from "@/components/settings/DependencyStatus";
import { SpotifyCookieSetting } from "@/components/settings/SpotifyCookieSetting";
import { YoutubeCookiesSetting } from "@/components/settings/YoutubeCookiesSetting";
import { DeezerArlSetting } from "@/components/settings/DeezerArlSetting";

function SettingsSection({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/50 bg-card p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function SettingsPage() {
  return (
    <div className="max-w-lg flex flex-col gap-4 pt-6 pb-6">
      <div className="mb-2">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your libraries and dependencies</p>
      </div>

      <SettingsSection
        title="Music libraries"
        description="Your local music collections. Switch between them from the sidebar."
      >
        <LibraryPathSetting />
      </SettingsSection>

      <SettingsSection
        title="Spotify account"
        description="Optional. Needed only for loading user profile playlists."
      >
        <SpotifyCookieSetting />
      </SettingsSection>

      <SettingsSection
        title="YouTube cookies"
        description="Optional. Allows yt-dlp to use your YouTube session, which can help bypass age gates and access restrictions."
      >
        <YoutubeCookiesSetting />
      </SettingsSection>

      <SettingsSection
        title="Deezer"
        description="Optional. Primary download source — fast and high quality. Requires an ARL token from your browser."
      >
        <DeezerArlSetting />
      </SettingsSection>

      <SettingsSection
        title="System dependencies"
        description="Required external tools. Install them manually – the app never modifies your system."
      >
        <DependencyStatus />
      </SettingsSection>
    </div>
  );
}
