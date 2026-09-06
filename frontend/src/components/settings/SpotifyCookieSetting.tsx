import { useConfig, useUpdateSpDc } from "@/hooks/useConfig";
import { SecretCookieSetting } from "./SecretCookieSetting";

export function SpotifyCookieSetting() {
  const { data: config } = useConfig();
  const updateSpDc = useUpdateSpDc();

  if (!config) return null;

  return (
    <SecretCookieSetting
      id="sp-dc"
      label="sp_dc cookie"
      placeholder="AQD..."
      savedValue={config.sp_dc}
      mutation={updateSpDc}
      savedMessage="Spotify cookie saved"
      removedMessage="Spotify cookie removed"
      helpText={
        <>
          Required only for loading user profiles. Open{" "}
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-foreground hover:underline"
          >
            open.spotify.com
          </a>{" "}
          in a browser, open DevTools, go to Application, Cookies, copy the{" "}
          <span className="font-mono text-foreground">sp_dc</span> value and paste it here.
        </>
      }
    />
  );
}
