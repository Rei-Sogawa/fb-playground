import { JSXElementConstructor, PropsWithChildren, ReactNode } from "react";

type Props = {
  components: JSXElementConstructor<PropsWithChildren<any>>[];
  children: ReactNode;
};

export default function ComposeProviders(props: Props) {
  const { components = [], children } = props;
  return (
    <>
      {components.reduceRight(
        (acc, Component) => (
          <Component>{acc}</Component>
        ),
        children
      )}
    </>
  );
}
