import { TruckElectric } from "lucide-react";

export const recitalPricesByClassId: Record<
  string,
  { price: number; allowMultiDiscount: boolean }
> = {
  "1088223": { price: 150, allowMultiDiscount: true }, // BALLET (2-3yrs)
  "1101833": { price: 150, allowMultiDiscount: true }, // BALLET LEVEL 1&2
  "1122064": { price: 150, allowMultiDiscount: true }, // BALLET LEVEL 1&2
  "1088190": { price: 150, allowMultiDiscount: true }, // BALLET LEVEL 2
  "1088184": { price: 150, allowMultiDiscount: true }, // BALLET LEVEL 3
  "1101829": { price: 150, allowMultiDiscount: true }, // BALLET LEVEL 3
  "1088031": { price: 175, allowMultiDiscount: true }, // BALLET/TAP LEVEL 1
  "1088207": { price: 150, allowMultiDiscount: true }, // CONTEMPORARY LEVEL 1
  "1088205": { price: 150, allowMultiDiscount: true }, // CONTEMPORARY LEVEL 3
  "1088203": { price: 175, allowMultiDiscount: true }, // INT. HIP HOP
  "1088036": { price: 175, allowMultiDiscount: false }, // JAZZ/LYRICAL LEVEL 1
  "1088216": { price: 175, allowMultiDiscount: false }, // JAZZ/LYRICAL LEVEL 2
  "1088217": { price: 175, allowMultiDiscount: false }, // JAZZ/LYRICAL LEVEL 3
  "1121457": { price: 175, allowMultiDiscount: true }, // MINI HIP HOP
  "1088226": { price: 150, allowMultiDiscount: false }, // MINI MOVERS
  "1088228": { price: 175, allowMultiDiscount: false }, // MINI MOVERS
  "1088230": { price: 150, allowMultiDiscount: false }, // MINI MOVERS
  "1088186": { price: 175, allowMultiDiscount: true }, // PEEWEE HIP HOP
  "1101831": { price: 150, allowMultiDiscount: true }, // POINTE
  "1088048": { price: 150, allowMultiDiscount: true }, // POINTE
  "1121458": { price: 75, allowMultiDiscount: false }, // TAP ADULT
  "1088211": { price: 75, allowMultiDiscount: false }, // TAP LEVEL 2
  "1088220": { price: 175, allowMultiDiscount: false }, // TAP/BALLET/JAZZ
  "1088225": { price: 175, allowMultiDiscount: false }, // TAP/BALLET/JAZZ (Sat
  "1088224": { price: 150, allowMultiDiscount: false }, // TAP/BALLET/TUMBLING
  "1088033": { price: 150, allowMultiDiscount: false }, // TAP/BALLET/TUMBLING
  "1088204": { price: 150, allowMultiDiscount: false }, // TAP/BALLEY/TUMBLING
};
