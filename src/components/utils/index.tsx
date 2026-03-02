export const generateRandomString = (num: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < num; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const displayName = (name: string) => {
  name = name || "Hidden";
  return name?.slice(0, 1) + "***" + name?.slice(-1);
};

export const binaryToFloat = (input: string | number | null | undefined) => {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : 0;
  }

  if (typeof input !== "string") {
    return 0;
  }

  const value = input.trim();
  if (!value) {
    return 0;
  }

  // Legacy format: binary string e.g. "101.01"
  const isBinaryLike = /^[01]+(\.[01]+)?$/.test(value);
  if (isBinaryLike) {
    const [integerPart, fractionalPart] = value.split(".");
    const integerDecimal = parseInt(integerPart, 2);
    let fractionalDecimal = 0;
    if (fractionalPart) {
      for (let i = 0; i < fractionalPart.length; i++) {
        fractionalDecimal += parseInt(fractionalPart[i], 2) * Math.pow(2, -(i + 1));
      }
    }
    return Number(integerDecimal + fractionalDecimal);
  }

  // Current format: decimal amount string.
  const numeric = Number(value.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};
