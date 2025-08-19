import { Asterisk, Terminal } from "lucide-react";

export default async function Logo() {
  return (
    <div className="m-auto mt-20 relative w-[600px] h-[600px]">
      <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-[200px] w-full h-full">
        <div className="relative">
          <Terminal className="h-[350px] w-[350px] text-white relative top-[120px] left-[120px]" />
          <Asterisk className="h-[200px] w-[200px] text-white absolute top-14 right-[90px]" />
        </div>
      </div>
    </div>
  );
}
