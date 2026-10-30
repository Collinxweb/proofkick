// /u/<username> is the public profile. It shows the same verified record as /s/<username>.
export const revalidate = 120;
export const maxDuration = 60;
export { default, generateMetadata } from "../../s/[handle]/page";
