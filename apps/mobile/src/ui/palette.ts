export const lightColors = {
  onPrimary: "#FFFFFF", dangerBg: "#FCECF0", subtle: "#EDEEF5", track: "#F0F1F6", warm: "#BA7549", stackBack: "#E8E6F5", stackFront: "#F0EEFA",
  bg: "#F7F8FC",
  card: "#FFFFFF",
  ink: "#20233D",
  muted: "#73768C",
  primary: "#6155E8",
  pale: "#EEECFF",
  border: "#E9EAF2",
  red: "#D84D65",
  success: "#21856F",
  mint: "#E6F5EF",
  peach: "#FFF0E7",
};

export const darkColors: typeof lightColors = {
  onPrimary: "#161325", dangerBg: "#452A36", subtle: "#272A3E", track: "#323549", warm: "#DCA772", stackBack: "#292B42", stackFront: "#24263A",
  bg: "#12131C", card: "#1E2030", ink: "#ECECF5", muted: "#A4A7BD",
  primary: "#897BF5", pale: "#302C50", border: "#35384C", red: "#F08B9D",
  success: "#79CCB2", mint: "#203D37", peach: "#443329",
};
export type Palette = typeof lightColors;
