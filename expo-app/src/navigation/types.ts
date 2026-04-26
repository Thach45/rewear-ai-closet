export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  AvatarSetup: undefined;
};

export type MainTabParamList = {
  Home:
    | {
        previewOutfit?: {
          topId: string;
          bottomId: string;
          shoesId: string;
          vibe: string;
        };
      }
    | undefined;
  Wardrobe: undefined;
  WearLog: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
