import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logAdminAction({
  adminId,
  actionType,
  targetTable,
  targetId,
  oldData,
  newData,
  ipAddress,
}: {
  adminId: string;
  actionType: string;
  targetTable: string;
  targetId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    admin_id: adminId,
    action_type: actionType,
    target_table: targetTable,
    target_id: targetId,
    old_data: oldData || null,
    new_data: newData || null,
    ip_address: ipAddress || "unknown",
  });

  if (error) {
    console.error("[AUDIT LOG] Failed to insert log:", error.message);
  } else {
    console.log(`[AUDIT LOG] ${actionType} on ${targetTable}/${targetId} by admin ${adminId}`);
  }
}
