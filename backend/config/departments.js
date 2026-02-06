export const DEPARTMENTS = [
  { id: "ICU", name: "ICU" },
  { id: "OPD", name: "OPD" },
  { id: "RAD", name: "Radiology" },
  { id: "LAB", name: "Laboratory" },
  { id: "OT", name: "Operation Theatre" },
];

export const isValidDepartmentId = (id) =>
  DEPARTMENTS.some((d) => d.id === id);
