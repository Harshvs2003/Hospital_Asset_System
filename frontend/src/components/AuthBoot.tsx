import React from "react";
import { Loader } from "lucide-react";

const AuthBoot: React.FC = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Loader className="w-4 h-4 animate-spin text-blue-600" />
      <span>Checking session...</span>
    </div>
  </div>
);

export default AuthBoot;
