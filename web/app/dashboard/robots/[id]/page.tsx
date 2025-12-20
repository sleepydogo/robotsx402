export default async function RobotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <h1>Robot Detail: {id}</h1>
    </div>
  );
}
