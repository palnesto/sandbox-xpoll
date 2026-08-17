export type Option = { _id: string; value: string; label: string };

export type PollType = {
  id: string; // required for answer map
  title: string;
  description?: string;
  options: Option[];
};
