export default function CustomerPanel({ customer }) {
  return (
    <div className="p-4 border h-full">

      <h2 className="text-xl font-bold">
        {customer.name}
      </h2>

      <p>Loan: {customer.loan}</p>

      <div className="mt-4">

        <img
          src="/face.jpg"
          className="rounded-lg"
        />

        <div className="mt-2">
          Face Match: {customer.faceConfidence}%
        </div>

        <div>
          Liveness: {customer.liveness}%
        </div>

      </div>

    </div>
  );
}