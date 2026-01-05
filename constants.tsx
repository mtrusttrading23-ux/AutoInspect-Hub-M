
import React from 'react';

export const CAR_BRANDS = ["تويوتا", "نيسان", "هيونداي", "كيا", "مرسيدس", "بي إم دبليو", "فورد", "شيفروليه", "هوندا", "ميتسوبيشي"];
export const CAR_COLORS = ["أبيض", "أسود", "فضي", "رمادي", "أحمر", "أزرق", "بني", "ذهبي"];

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-800",
    LOCKED: "bg-gray-200 text-gray-800 border border-gray-300",
    PENDING_PERMISSION: "bg-amber-100 text-amber-800 border border-amber-200",
    PERMISSION_GRANTED: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    REJECTED: "bg-red-100 text-red-800",
    DRAFT: "bg-gray-100 text-gray-800",
  };

  const labels: Record<string, string> = {
    APPROVED: "معتمد",
    LOCKED: "مقفل",
    PENDING_PERMISSION: "بانتظار إذن التعديل",
    PERMISSION_GRANTED: "صلاحية التعديل متاحة",
    REJECTED: "مرفوض",
    DRAFT: "مسودة",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${styles[status] || styles.DRAFT}`}>
      {labels[status] || status}
    </span>
  );
};
