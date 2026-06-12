import UserReportClient from '@/components/admin/UserReportClient';

export default async function UserReportPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <UserReportClient userId={userId} />;
}
