import BikeGame from "@/components/bike-game"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <h1 className="text-4xl font-bold text-white mb-6 font-pixel">♡ Feliz Cumple Delfi ♡ </h1>
      <BikeGame />
    </main>
  )
}
