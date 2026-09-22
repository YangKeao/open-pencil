{ lib, stdenvNoCC, fetchurl, unzip }:

stdenvNoCC.mkDerivation {
  pname = "openpencil-local";
  version = "0.15.1-yangkeao.1";

  src = fetchurl {
    url = "https://github.com/YangKeao/open-pencil/releases/download/local-v0.15.1-1/OpenPencil-Local-0.15.1-yangkeao.1-aarch64-darwin.zip";
    hash = "sha256-bWRjUfOHFo7W6/u3RXNeqfZXSF9oODvpPyyWer9eXmk=";
  };

  nativeBuildInputs = [ unzip ];
  sourceRoot = ".";
  # Preserve the ad-hoc code signature: do not strip or rewrite the bundle.
  dontFixup = true;
  installPhase = ''
    runHook preInstall
    mkdir -p "$out/Applications"
    cp -R "OpenPencil Local.app" "$out/Applications/"
    runHook postInstall
  '';

  meta = {
    description = "OpenPencil with the MCP page-switch persistence fix";
    homepage = "https://github.com/YangKeao/open-pencil";
    license = lib.licenses.mit;
    platforms = [ "aarch64-darwin" ];
  };
}
