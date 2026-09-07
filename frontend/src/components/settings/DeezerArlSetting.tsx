import { useConfig, useUpdateDeezerArl } from "@/hooks/useConfig";
import { SecretCookieSetting } from "./SecretCookieSetting";

export function DeezerArlSetting() {
  const { data: config } = useConfig();
  const updateArl = useUpdateDeezerArl();

  if (!config) return null;

  return (
    <SecretCookieSetting
      id="deezer-arl"
      label="ARL token"
      placeholder="ARL token"
      savedValue={config.deezer_arl}
      mutation={updateArl}
      savedMessage="Deezer ARL saved"
      removedMessage="Deezer ARL removed"
      helpText={
        <>
          Required for Deezer downloads. Open{" "}
          <a
            href="https://www.deezer.com"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-foreground hover:underline"
          >
            deezer.com
          </a>{" "}
          in a browser, open DevTools, go to Application, then Cookies, copy the{" "}
          <span className="font-mono text-foreground">arl</span> value and paste it here.
          A free account is enough.
        </>
      }
    />
  );
}
