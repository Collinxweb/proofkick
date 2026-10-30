import { redirect } from "next/navigation";

// The front door is /create. Old links and sign-in redirects land here and move on.
export default function Dashboard() {
  redirect("/create");
}
