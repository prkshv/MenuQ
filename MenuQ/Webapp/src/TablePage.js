import { useParams } from "react-router-dom";

const TablePage = () => {
  const { id } = useParams();

  return (
    <div>
      <h1>Table #{id}</h1>
    </div>
  );
};
