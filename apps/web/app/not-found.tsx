import Link from "next/link";
import { ProductIcon } from "../components/ui/ProductIcon";

export default function NotFound() {
  return <section className="recovery-page" aria-labelledby="missing-title">
    <span className="iso-icon"><ProductIcon name="flow" /></span>
    <p className="eyebrow">404 / CONNECTION NOT FOUND</p>
    <h1 id="missing-title">A different direction.</h1>
    <p>This page could not be found. Return to the homepage or open your saved workflows.</p>
    <div><Link className="btn pri" href="/">Back to home</Link><Link className="btn" href="/workflows">My workflows</Link></div>
  </section>;
}
