import { describe, expect, it } from "vitest";

import { getMissingPublishRequirements } from "@/features/packages/lib/publish-requirements";

const complete = {
  sellingPrice: 650,
  duration: 5,
  coverImageUrl: "/seed-images/istanbul-7.jpg",
  imageCount: 3,
  activityCount: 4,
};

describe("getMissingPublishRequirements", () => {
  it("returns nothing when every requirement is met", () => {
    expect(getMissingPublishRequirements(complete)).toEqual([]);
  });

  it("flags a missing price", () => {
    expect(getMissingPublishRequirements({ ...complete, sellingPrice: null })).toContain(
      "a price",
    );
  });

  it("flags a missing duration", () => {
    expect(getMissingPublishRequirements({ ...complete, duration: null })).toContain(
      "a duration",
    );
  });

  it("flags no picture only when both cover and gallery are empty", () => {
    expect(
      getMissingPublishRequirements({ ...complete, coverImageUrl: null, imageCount: 0 }),
    ).toContain("at least one picture");
    expect(
      getMissingPublishRequirements({ ...complete, coverImageUrl: null, imageCount: 2 }),
    ).not.toContain("at least one picture");
    expect(
      getMissingPublishRequirements({ ...complete, coverImageUrl: "/x.jpg", imageCount: 0 }),
    ).not.toContain("at least one picture");
  });

  it("flags an empty itinerary", () => {
    expect(getMissingPublishRequirements({ ...complete, activityCount: 0 })).toContain(
      "at least one itinerary activity",
    );
  });

  it("can report multiple missing requirements at once", () => {
    const missing = getMissingPublishRequirements({
      sellingPrice: null,
      duration: null,
      coverImageUrl: null,
      imageCount: 0,
      activityCount: 0,
    });
    expect(missing).toHaveLength(4);
  });
});
