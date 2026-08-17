import React from "react";

interface BaseProps<T> {
  arr: T[];
  enableNext?: boolean;
  enablePrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  ui: (prop: T) => React.ReactNode; // 👈 ui is a function of T → JSX
}

function Base<T>({
  arr,
  enableNext = true,
  enablePrev = true,
  onNext,
  onPrev,
  ui,
}: BaseProps<T>) {
  return (
    <div>
      <button disabled={!enablePrev} onClick={onPrev}>
        prev
      </button>

      <div>
        {arr.map((item, idx) => (
          <div key={idx}>{ui(item)}</div> // ✅ pass item directly
        ))}
      </div>

      <button disabled={!enableNext} onClick={onNext}>
        next
      </button>
    </div>
  );
}

type Option = {
  _id: string;
  value: string;
  label: string;
};
type PollType = {
  _id: string;
  title: string;
  description: string;
  options: Option[];
};
type PollSwipeProps = Omit<BaseProps<PollType>, "ui"> & {
  onOptionClick: (pollId: string, optionId: Option["_id"]) => void;
};

const GenericPollSwipper = ({
  onOptionClick,
  ...baseProps
}: PollSwipeProps) => {
  return (
    <Base
      {...baseProps}
      ui={({ _id: pollId, title, description, options }) => {
        return (
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
            <div>
              {options.map(({ _id: optionId, value, label }) => (
                <div
                  key={optionId}
                  onClick={() => onOptionClick(pollId, optionId)}
                >
                  <p>{label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
};

// definitions till now

const testArr: PollType[];

const MyComponent1 = () => {
  return (
    <div>
      <h1>Standalone poll page</h1>
      <GenericPollSwipper
        arr={testArr}
        onOptionClick={(pollId: string, optionId: Option["_id"]) => {
          console.log(optionId, pollId, "calling api");
          // here we can infinitely fetch the arr state
        }}
        enableNext={true}
        enablePrev={false}
        onNext={() => console.log("next")}
        onPrev={() => console.log("prev")}
      />
    </div>
  );
};

const MyComponent2 = () => {
  return (
    <div>
      <h1>trial poll page</h1>
      <GenericPollSwipper
        arr={testArr}
        onOptionClick={(pollId: string, optionId: Option["_id"]) => {
          console.log("state update in store", optionId, pollId);
          // here we can have a one time fetched arr state stored in a zustand store
        }}
        enableNext={true}
        enablePrev={false}
        onNext={() => console.log("next")}
        onPrev={() => console.log("prev")}
      />
    </div>
  );
};
