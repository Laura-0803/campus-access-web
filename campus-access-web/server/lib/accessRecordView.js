// 本模块负责为通行记录补充人员编号等展示字段，不修改原始记录对象。
// 增强单条通行记录：通过 personId 查找人员档案，并补齐前端展示所需的 personCode。
export function enrichAccessRecord(record, people = []) {
  // 仅在记录存在 personId 时查找关联人员；没有关联 ID 的人工记录保持 person 为 null。
  const person = record?.personId
    ? people.find((item) => item.id === record.personId)
    : null;

  // 使用展开运算符生成新对象；人员档案编号优先，其次沿用记录已有编号，最后回退为空字符串。
  return {
    ...record,
    personCode: person?.code || record?.personCode || ""
  };
}

// 批量增强通行记录：预先建立 ID 到人员的映射，避免每条记录都遍历一次人员数组。
export function enrichAccessRecords(records = [], people = []) {
  // Map 将人员查找从线性扫描优化为按 ID 的常数时间读取。
  const peopleById = new Map(people.map((person) => [person.id, person]));
  // map 返回全新的记录数组，不会改变传入的 records。
  return records.map((record) => ({
    ...record,
    personCode: peopleById.get(record.personId)?.code || record.personCode || ""
  }));
}
