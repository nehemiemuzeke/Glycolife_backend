import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "glycolife_super_secret_key_2025";

/**
 * Génère un jeton JWT valide pour 30 jours
 */
export const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};

// Alias requis par les routes d'authentification (auth.ts)
export const signToken = generateToken;

/**
 * Vérifie un jeton JWT
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};