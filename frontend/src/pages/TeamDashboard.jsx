import { useParams } from "react-router-dom";

export default function TeamDashboard() {
  const { id } = useParams();
  return <h2 className="text-2xl font-bold">Team Dashboard for ID: {id}</h2>;
}
