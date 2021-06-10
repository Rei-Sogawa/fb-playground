import { JSXElementConstructor, PropsWithChildren, ReactNode } from "react";

type Props = {
  providers: JSXElementConstructor<PropsWithChildren<any>>[];
  children: ReactNode;
};

export default function ComposeProviders(props: Props) {
  const { providers = [], children } = props;
  return (
    <>
      {providers.reduceRight(
        (acc, Provider) => (
          <Provider>{acc}</Provider>
        ),
        children
      )}
    </>
  );
}
