import type { Role } from "@/lib/firebase/auth";

export function homeForRole(role: Role): string {
  switch (role) {
    case "admin": return "/admin-dashboard";
    case "driver": return "/today";
    case "rider": return "/dashboard";
    default: return "/dashboard";
  }
}
