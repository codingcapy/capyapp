export default function Header() {
  return (
    <div className="bg-[#040406] text-white py-5 px-7">
      <div className="md:flex justify-between">
        <div className="md:flex">
          <div className="mx-2">Home</div>
          <div className="mx-2">About</div>
          <div className="mx-2">Contact</div>
        </div>
        <div className="md:flex">
          <div className="mx-2">Login</div>
          <div className="mx-2">Signup</div>
        </div>
      </div>
    </div>
  );
}
