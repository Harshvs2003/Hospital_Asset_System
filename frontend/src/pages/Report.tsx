import React from "react";

const ReportPage: React.FC = () => {
  const [reportType, setReportType] = React.useState("summary");

  const stats = {
    totalAssets: 1250,
    available: 950,
    maintenance: 200,
    damaged: 100,
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-600 text-sm font-medium mb-1">Total Assets</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalAssets}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-600 text-sm font-medium mb-1">Available</h3>
          <p className="text-3xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-600 text-sm font-medium mb-1">Under Maintenance</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.maintenance}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-600 text-sm font-medium mb-1">Damaged</h3>
          <p className="text-3xl font-bold text-red-600">{stats.damaged}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="summary">Summary</option>
            <option value="detailed">Detailed</option>
            <option value="by-category">By Category</option>
            <option value="by-location">By Location</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
            Export to PDF
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-600">
            <thead className="border-b border-gray-300">
              <tr>
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Total</th>
                <th className="text-left py-2">Available</th>
                <th className="text-left py-2">Under Maintenance</th>
                <th className="text-left py-2">Damaged</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Beds</td>
                <td>120</td>
                <td>90</td>
                <td>20</td>
                <td>10</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Machines</td>
                <td>85</td>
                <td>70</td>
                <td>10</td>
                <td>5</td>
              </tr>
              <tr>
                <td className="py-2">Medical Tools</td>
                <td>230</td>
                <td>200</td>
                <td>20</td>
                <td>10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
