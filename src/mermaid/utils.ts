export function parseNumber(
  number: string | number | undefined,
  defaultVal = 0,
) {
  if (typeof number === "number") {
    return number;
  }
  const num = parseFloat(number || "");
  return isNaN(num) ? defaultVal : num;
}

//TODO parseTransform
