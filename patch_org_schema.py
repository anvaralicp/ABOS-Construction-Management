import sys

def patch_schema(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update Organization model
    old_org_top = """model Organization {
  id         String    @id @default(uuid()) @db.Uuid
  name       String
  status     OrgStatus @default(ACTIVE)
  
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?"""
    new_org_top = """model Organization {
  id         String    @id @default(uuid()) @db.Uuid
  name       String
  legal_name String?
  code       String?
  address    String?
  phone      String?
  email      String?
  website    String?
  status     OrgStatus @default(ACTIVE)
  
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?"""
    if "legal_name String?" not in content:
        content = content.replace(old_org_top, new_org_top)
        
    old_org_bottom = """  tax_configs       GstTaxConfig[]
  reports           Report[]

  @@map("organizations")
}"""
    new_org_bottom = """  tax_configs       GstTaxConfig[]
  reports           Report[]
  settings          OrganizationSettings?

  @@map("organizations")
}

enum WeekStart {
  MONDAY
  SUNDAY
}

model OrganizationSettings {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @unique @db.Uuid
  timezone        String   @default("UTC")
  currency        String   @default("INR")
  locale          String   @default("en-IN")
  date_format     String   @default("DD/MM/YYYY")
  number_format   String   @default("IN")
  week_start      WeekStart @default(MONDAY)
  
  version         Int      @default(1)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  organization Organization @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  @@map("organization_settings")
}"""
    if "model OrganizationSettings" not in content:
        content = content.replace(old_org_bottom, new_org_bottom)

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_schema(sys.argv[1])
