export default function RobotDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Robot Detail: {params.id}</h1>
    </div>
  );
}
