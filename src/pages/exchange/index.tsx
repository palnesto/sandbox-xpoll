// import ExchangeCards from "@/components/dashboard/Exchange";
import HomeExchangeCards from "@/components/dashboard/HomeExchange";

const Exchange = () => {
  // const navigate = useNavigate();
  return (
    <main className="px-2 md:px-7 py-4">
      <HomeExchangeCards />
      {/* <ExchangeCards /> */}
      {/* <Card
        onClick={() => {
          navigate("/exchange/exchange-strain");
        }}
        className="mt-20 py-10 px-5 hover:font-semibold cursor-pointer"
      >
        <p>Claim strain coin</p>
      </Card> */}
    </main>
  );
};

export default Exchange;
