import sys
import re

def patch_schema(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Add enums before Notification model
    enums = """
enum NotificationType {
  SYSTEM
  BUDGET_ALERT
  EXPENSE
  PROJECT
  PAYMENT
  DOCUMENT
  PROGRESS
  WORKFORCE
  EQUIPMENT
  TAX
  SECURITY
}

enum NotificationSeverity {
  INFO
  SUCCESS
  WARNING
  ERROR
  CRITICAL
}
"""
    if "enum NotificationType {" not in content:
        content = content.replace("model Notification {", enums + "\nmodel Notification {")

    # 2. Update Notification model
    old_notification = """model Notification {
  id              String    @id @default(uuid()) @db.Uuid
  organization_id String    @db.Uuid
  user_id         String    @db.Uuid
  title           String
  body            String
  type            String
  read_at         DateTime?
  
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?

  user User @relation(fields: [user_id], references: [id], onDelete: Restrict)

  @@index([organization_id, user_id])
  @@map("notifications")
}"""

    new_notification = """model Notification {
  id              String    @id @default(uuid()) @db.Uuid
  organization_id String    @db.Uuid
  user_id         String    @db.Uuid
  project_id      String?   @db.Uuid
  title           String
  body            String
  type            NotificationType
  severity        NotificationSeverity @default(INFO)
  
  is_read         Boolean   @default(false)
  read_at         DateTime?
  expires_at      DateTime?
  metadata        Json?
  
  deduplication_key String?
  
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?

  user         User         @relation(fields: [user_id], references: [id], onDelete: Restrict)
  organization Organization @relation(fields: [organization_id], references: [id], onDelete: Restrict)
  project      Project?     @relation(fields: [project_id], references: [id], onDelete: Restrict)

  @@index([organization_id, user_id, is_read, created_at])
  @@index([organization_id, deduplication_key])
  @@map("notifications")
}"""
    
    if "NotificationType" not in old_notification:
        # We can use regex to replace it just in case there are minor whitespace differences
        content = re.sub(r'model Notification \{.*?\n\}', new_notification, content, flags=re.DOTALL)

    # 3. Add relations to Organization and Project
    if "notifications Notification[]" not in content.split('model Organization {')[1].split('}')[0]:
        content = content.replace("  sync_events       SyncQueueEvent[]", "  sync_events       SyncQueueEvent[]\n  notifications     Notification[]")
        
    if "notifications Notification[]" not in content.split('model Project {')[1].split('}')[0]:
        content = content.replace("  members               ProjectMember[]", "  members               ProjectMember[]\n  notifications         Notification[]")

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_schema(sys.argv[1])
