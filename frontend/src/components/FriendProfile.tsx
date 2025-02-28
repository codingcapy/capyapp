import { Friend } from "../lib/api/friend";
import { CgProfile } from "react-icons/cg";
import profilePic from "/capypaul01.jpg";

export default function FriendProfile(props: { friend: Friend | null }) {
  const { friend } = props;
  return (
    <div className="md:w-[55%] md:border-r md:h-screen overflow-auto">
      <div className="fixed top-0 left-0 md:left-[30%] flex bg-[#040406] p-5 w-screen md:w-[54%]">
        <CgProfile size={25} className="" />
        <div className="ml-2 text-xl">{friend && friend.username}</div>
      </div>
      <div className="p-5 pt-[100px]">
        <img
          src={profilePic}
          className="max-w-30 md:max-w-xs rounded-full mx-auto pb-2"
        />
        <button className="border-2 border-cyan-600 text-cyan-600 font-bold px-5 py-2 my-5 w-[300px] mx-auto rounded hover:bg-cyan-600 hover:text-black ease-in-out duration-300">
          Start chat
        </button>
        <div className="">
          Cheesecake sesame snaps gingerbread liquorice brownie. Jelly
          shortbread cake chocolate lemon drops shortbread tart. Caramels
          tootsie roll shortbread bear claw gingerbread. Dragée jelly soufflé
          muffin jelly. Dessert donut pie powder pastry chocolate cake
          marshmallow bear claw. Cupcake candy brownie bonbon lollipop icing
          cotton candy oat cake toffee. Fruitcake soufflé pie tart candy.
          Marshmallow gingerbread jelly fruitcake marzipan shortbread
          marshmallow jelly muffin. Candy ice cream cake gummies marzipan.
          Gingerbread donut pie cookie bear claw apple pie sesame snaps jelly-o.
          Tart cheesecake cookie icing cupcake sweet candy canes shortbread
          liquorice. Brownie bear claw jujubes soufflé gummi
        </div>
      </div>
    </div>
  );
}
