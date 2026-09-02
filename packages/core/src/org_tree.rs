use std::collections::{HashMap, HashSet};

use crate::types::OrgFlatInput;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OrgTreeError {
    DuplicateId(String),
    Cycle(String),
    UnknownOrg(String),
    Empty,
    InvalidMetrics(String),
    UnknownParent { child: String, parent: String },
}

impl OrgTreeError {
    pub fn message(&self) -> String {
        match self {
            OrgTreeError::DuplicateId(id) => format!("Duplicate organization id: {id}"),
            OrgTreeError::Cycle(id) => format!("Cycle detected in parentOrgId at {id}"),
            OrgTreeError::UnknownOrg(id) => format!("Unknown organization: {id}"),
            OrgTreeError::Empty => "Empty organizations".into(),
            OrgTreeError::InvalidMetrics(msg) => msg.clone(),
            OrgTreeError::UnknownParent { child, parent } => {
                format!("Unknown parentOrgId: {parent} (referenced by {child})")
            }
        }
    }
}

pub fn validate_org_hierarchy(organizations: &[OrgFlatInput]) -> Result<(), OrgTreeError> {
    if organizations.is_empty() {
        return Err(OrgTreeError::Empty);
    }

    let mut ids = HashSet::new();
    for org in organizations {
        if !ids.insert(org.id.clone()) {
            return Err(OrgTreeError::DuplicateId(org.id.clone()));
        }
    }

    for org in organizations {
        if let Some(parent) = org.parent_org_id.as_deref() {
            if !ids.contains(parent) {
                return Err(OrgTreeError::UnknownParent {
                    child: org.id.clone(),
                    parent: parent.to_string(),
                });
            }
        }
    }

    // Tri-color DFS: each node proven acyclic at most once → O(n) total.
    let by_id: HashMap<&str, &'_ OrgFlatInput> =
        organizations.iter().map(|o| (o.id.as_str(), o)).collect();

    let mut done: HashSet<&str> = HashSet::new();
    let mut in_stack: HashSet<&str> = HashSet::new();

    for org in organizations {
        if done.contains(org.id.as_str()) {
            continue;
        }
        if let Some(cycle_id) = walk_parent_chain(org.id.as_str(), &by_id, &mut done, &mut in_stack)
        {
            return Err(OrgTreeError::Cycle(cycle_id.to_string()));
        }
    }

    Ok(())
}

fn walk_parent_chain<'a>(
    start_id: &'a str,
    by_id: &HashMap<&str, &'a OrgFlatInput>,
    done: &mut HashSet<&'a str>,
    in_stack: &mut HashSet<&'a str>,
) -> Option<&'a str> {
    let mut path: Vec<&'a str> = Vec::new();
    let mut cur = Some(start_id);

    while let Some(id) = cur {
        if done.contains(id) {
            break;
        }
        if in_stack.contains(id) {
            return Some(id);
        }
        in_stack.insert(id);
        path.push(id);
        cur = by_id.get(id).and_then(|o| o.parent_org_id.as_deref());
    }

    for id in &path {
        in_stack.remove(id);
        done.insert(id);
    }
    None
}

#[allow(dead_code)]
fn has_cycle(start_id: &str, by_id: &HashMap<&str, &OrgFlatInput>) -> bool {
    let mut visited = HashSet::new();
    let mut cur = Some(start_id);
    while let Some(id) = cur {
        if !visited.insert(id) {
            return true;
        }
        cur = by_id.get(id).and_then(|o| o.parent_org_id.as_deref());
    }
    false
}

pub fn extract_subtree<'a>(
    organizations: &'a [OrgFlatInput],
    root_id: &str,
) -> Result<Vec<&'a OrgFlatInput>, OrgTreeError> {
    let by_id: HashMap<&str, &'a OrgFlatInput> =
        organizations.iter().map(|o| (o.id.as_str(), o)).collect();

    if !by_id.contains_key(root_id) {
        return Err(OrgTreeError::UnknownOrg(root_id.into()));
    }

    let mut result = Vec::new();
    let mut stack = vec![root_id];
    while let Some(id) = stack.pop() {
        let org = by_id[id];
        result.push(org);
        for child in organizations
            .iter()
            .filter(|o| o.parent_org_id.as_deref() == Some(id))
        {
            stack.push(child.id.as_str());
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn org(id: &str, parent: Option<&str>, name: &str) -> OrgFlatInput {
        OrgFlatInput {
            id: id.into(),
            parent_org_id: parent.map(str::to_string),
            name: name.into(),
        }
    }

    #[test]
    fn validate_success_single_root() {
        let orgs = vec![org("a", None, "A"), org("b", Some("a"), "B")];
        assert!(validate_org_hierarchy(&orgs).is_ok());
    }

    #[test]
    fn validate_failure_duplicate_id() {
        let orgs = vec![org("a", None, "A"), org("a", None, "A2")];
        let err = validate_org_hierarchy(&orgs).unwrap_err();
        assert!(matches!(err, OrgTreeError::DuplicateId(_)));
    }

    #[test]
    fn validate_failure_unknown_parent() {
        let orgs = vec![org("a", None, "A"), org("b", Some("missing"), "B")];
        let err = validate_org_hierarchy(&orgs).unwrap_err();
        match err {
            OrgTreeError::UnknownParent { child, parent } => {
                assert_eq!(child, "b");
                assert_eq!(parent, "missing");
            }
            other => panic!("expected UnknownParent, got {other:?}"),
        }
    }

    #[test]
    fn validate_failure_cycle() {
        let orgs = vec![org("a", Some("b"), "A"), org("b", Some("a"), "B")];
        let err = validate_org_hierarchy(&orgs).unwrap_err();
        assert!(matches!(err, OrgTreeError::Cycle(_)));
    }

    #[test]
    fn extract_subtree_success() {
        let orgs = vec![
            org("root", None, "Root"),
            org("c1", Some("root"), "C1"),
            org("c2", Some("root"), "C2"),
            org("other", None, "Other"),
        ];
        let subtree = extract_subtree(&orgs, "root").unwrap();
        assert_eq!(subtree.len(), 3);
        assert!(subtree.iter().all(|o| o.id != "other"));
    }

    #[test]
    fn extract_subtree_failure_unknown() {
        let orgs = vec![org("a", None, "A")];
        let err = extract_subtree(&orgs, "missing").unwrap_err();
        assert!(matches!(err, OrgTreeError::UnknownOrg(_)));
    }
}
