// Generate randomness
export const randomPosNeg = () => {
  const random = Math.sin( 2 * Math.PI * Math.random() );
  // Add some skey for better bell curve
  return random ** 3;
};
export const vx = () => {
  return 0.3 * randomPosNeg();
};

export enum BODIES_LABElS {
  BALL = "BAll",
  PARTITION = "PARTITION",
  WALL_TOP = "WALL_TOP",
  WALL_BOTTOM = "WALL_BOTTOM",
  WALL_LEFT = "WALL_LEFT",
  WALL_RIGHT = "WALL_RIGHT",
  PEG = "PEG",
  PARTITION_POINT = "PARTITION_POINT"
}