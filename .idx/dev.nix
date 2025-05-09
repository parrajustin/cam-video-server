# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.docker
    pkgs.nodejs_22
    pkgs.corepack_22
  ];

  # Sets environment variables in the workspace
  env = {
    pnpm = "corepack pnpm";
  };
  services.docker.enable = true;
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "golang.go"
      "ms-azuretools.vscode-docker"
      "EditorConfig.EditorConfig"
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "Gruntfuggly.todo-tree"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # web = {
        #   # Example: run "npm run dev" with PORT set to IDX's defined port for previews,
        #   # and show it in IDX's web preview panel
        #   command = ["npm" "run" "dev"];
        #   manager = "web";
        #   env = {
        #     # Environment variables to set for your server
        #     PORT = "$PORT";
        #   };
        # };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        package-install = "corepack install";
        node-install = "pnpm install";
      };
      # Runs when the workspace is (re)started
      onStart = {
        node-install = "pnpm install";
        # Example: start a background task to watch and re-build backend code
        # watch-backend = "npm run watch-backend";
      };
    };
  };
}
