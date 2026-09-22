{ lib, stdenvNoCC, fetchurl, unzip }:

stdenvNoCC.mkDerivation {
  pname = "openpencil-local";
  version = "0.15.1-yangkeao.2";

  src = fetchurl {
    url = "https://github.com/YangKeao/open-pencil/releases/download/local-v0.15.1-2/OpenPencil-Local-0.15.1-yangkeao.2-aarch64-darwin.zip";
    hash = "sha256-y1dKzHUqJU/DAd3nyQDmBqtO9Cf7KiyGEEXmqgPh2JE=";
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
